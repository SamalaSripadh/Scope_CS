const axios = require('axios');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

class PlatformAPI {
  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
  }

  async getProfileData(platform, username) {
    console.log(`Getting profile data for ${platform}: ${username}`);
    try {
      switch (platform) {
        case 'leetcode':
          return await this.getLeetCodeProfile(username);
        case 'codeforces':
          return await this.getCodeforcesProfile(username);
        case 'codechef':
          return await this.getCodeChefProfile(username);
        case 'hackerrank':
          return await this.getHackerRankProfile(username);
        default:
          throw new Error('Invalid platform');
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new Error(`Username ${username} not found on ${platform}`);
      }
      throw new Error(`Failed to fetch ${platform} profile: ${error.message}`);
    }
  }

  async getLeetCodeProfile(username) {
    console.log('Fetching LeetCode profile for:', username);
    try {
      const query = `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            submitStats {
              acSubmissionNum {
                difficulty
                count
                submissions
              }
              totalSubmissionNum {
                difficulty
                count
                submissions
              }
            }
            profile {
              ranking
              reputation
              starRating
            }
          }
        }
      `;

      const response = await this.axiosInstance.post('https://leetcode.com/graphql', {
        query,
        variables: { username }
      });

      console.log('LeetCode API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      });

      if (!response.data.data.matchedUser) {
        throw new Error('User not found');
      }

      const { submitStats, profile } = response.data.data.matchedUser;
      const totalSolved = submitStats.acSubmissionNum.reduce((sum, item) => sum + item.count, 0);
      const totalSubmissions = submitStats.totalSubmissionNum.reduce((sum, item) => sum + item.submissions, 0);
      const rating = profile.starRating || profile.reputation || 0;

      return {
        username,
        score: totalSolved * 10,
        problemsSolved: totalSolved,
        rating: rating,
        rank: profile.ranking || 0,
        maxRating: rating,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('LeetCode API Error:', error);
      throw error;
    }
  }

  async getCodeforcesProfile(username) {
    console.log('Fetching Codeforces profile for:', username);
    try {
      const [userInfo, userStatus] = await Promise.all([
        this.axiosInstance.get(`https://codeforces.com/api/user.info?handles=${username}`),
        this.axiosInstance.get(`https://codeforces.com/api/user.status?handle=${username}`)
      ]);

      console.log('Codeforces API Response:', {
        status: userInfo.status,
        statusText: userInfo.statusText,
        data: userInfo.data,
        headers: userInfo.headers
      });

      if (userInfo.data.status !== 'OK') {
        throw new Error('User not found');
      }

      const user = userInfo.data.result[0];
      const submissions = userStatus.data.result;
      const uniqueProblems = new Set(
        submissions
          .filter(sub => sub.verdict === 'OK')
          .map(sub => `${sub.problem.contestId}${sub.problem.index}`)
      );

      const score = this.calculateCodeforcesScore(user.rating, uniqueProblems.size, submissions);

      console.log('Returning Codeforces profile data:', {
        username,
        score,
        problemsSolved: uniqueProblems.size,
        rating: user.rating || 0,
        rank: user.rank || 'newbie',
        maxRating: user.maxRating || 0
      });

      return {
        username,
        score,
        problemsSolved: uniqueProblems.size,
        rating: user.rating || 0,
        rank: user.rank || 'newbie',
        maxRating: user.maxRating || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Codeforces API Error:', error);
      throw error;
    }
  }

  calculateCodeforcesScore(rating, problemsSolved, submissions) {
    const baseScore = problemsSolved * 100;
    const ratingBonus = rating ? Math.floor(rating / 100) * 50 : 0;
    const contestParticipation = new Set(
      submissions
        .filter(sub => sub.author.participantType === 'CONTESTANT')
        .map(sub => sub.contestId)
    ).size;
    const contestBonus = contestParticipation * 200;

    return baseScore + ratingBonus + contestBonus;
  }

  async getCodeChefProfile(username) {
    console.log('Fetching CodeChef profile for:', username);
    try {
      const response = await this.axiosInstance.get(`https://www.codechef.com/users/${username}`);
      const $ = cheerio.load(response.data);

      const rating = parseInt($('.rating-number').text().trim()) || 0;
      const maxRating = parseInt($('.rating-header small').text().match(/\d+/)?.[0]) || 0;
      
      const pageText = $('body').text().toLowerCase();
      if (pageText.includes('404') || pageText.includes('not found') || $('.rating-number').length === 0) {
        throw new Error('CodeChef profile not found');
      }

      // Get fully solved problems count
      const fullySolvedCount = parseInt($('.rating-data-section').find('strong').first().text().trim()) || 0;
      
      if (rating === 0 && fullySolvedCount === 0 && contestCount === 0) {
        throw new Error('CodeChef profile not found or invalid');
      }

      // Get contest count from the rating history table
      const contestCount = $('.rating-table tbody tr').length || 0;

      const ranks = $('.rating-ranks').find('strong').map((i, el) => {
        return $(el).text().trim();
      }).get();

      const globalRank = ranks[0]?.match(/\d+/)?.[0] || '0';
      const countryRank = ranks[1]?.match(/\d+/)?.[0] || '0';

      const score = this.calculateCodeChefScore(rating, fullySolvedCount, contestCount);
      const stars = this.getCodeChefStars(rating);

      console.log('Returning CodeChef profile data:', {
        username,
        score,
        problemsSolved: fullySolvedCount,
        rating,
        stars,
        contestCount,
        rank: globalRank,
        maxRating,
        countryRank
      });

      return {
        username,
        score,
        problemsSolved: fullySolvedCount,
        rating,
        stars,
        contestCount,
        rank: globalRank,
        maxRating,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('CodeChef API Error:', error);
      throw error;
    }
  }

  calculateCodeChefScore(rating, problemsSolved, contestCount) {
    // CCPS*2 (CodeChef Problem Solved * 2)
    const problemScore = problemsSolved * 2;
    
    // (CCR-1200)^2/10 where CCR is CodeChef Rating
    const ratingBonus = rating > 1200 ? Math.pow(rating - 1200, 2) / 10 : 0;
    
    // CCNC*50 (CodeChef Number of Contests * 50)
    const contestScore = contestCount * 50;

    return Math.floor(problemScore + ratingBonus + contestScore);
  }

  getCodeChefStars(rating) {
    if (!rating) return 1;
    if (rating < 1400) return 1;
    if (rating < 1600) return 2;
    if (rating < 1800) return 3;
    if (rating < 2000) return 4;
    if (rating < 2200) return 5;
    if (rating < 2500) return 6;
    return 7;
  }

  async getHackerRankProfile(username) {
    try {
      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };

      // First verify profile exists
      const response = await fetch(`https://www.hackerrank.com/rest/contests/master/hackers/${username}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to verify profile: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data?.model) {
        throw new Error('Profile not found');
      }

      const profile = data.model;

      // Get scores
      const scores = await fetch(`https://www.hackerrank.com/rest/hackers/${username}/scores_elo`, {
        method: 'GET',
        headers
      }).then(r => r.ok ? r.json() : []).catch(() => []);

      // Get submissions
      const submissions = await fetch(`https://www.hackerrank.com/rest/hackers/${username}/submission_histories`, {
        method: 'GET',
        headers
      }).then(r => r.ok ? r.json() : {}).catch(() => ({}));

      let totalScore = 0;
      let bestRank = Number.MAX_SAFE_INTEGER;

      if (Array.isArray(scores)) {
        scores.forEach(track => {
          if (track.practice) {
            totalScore += track.practice.score || 0;
            if (track.practice.rank && track.practice.rank < bestRank) {
              bestRank = track.practice.rank;
            }
          }
        });
      }

      const totalProblems = Object.values(submissions).reduce((sum, count) => sum + count, 0);

      return {
        username,
        name: profile.name || username,
        score: totalScore,
        problemsSolved: totalProblems,
        rating: totalScore,
        rank: bestRank === Number.MAX_SAFE_INTEGER ? 0 : bestRank,
        maxRating: totalScore,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('HackerRank API Error:', error);
      throw new Error(`Failed to verify HackerRank profile: ${error.message}`);
    }
  }
}

module.exports = new PlatformAPI();
