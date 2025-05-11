import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const platforms = [
  { name: 'CodeChef', key: 'codechef' },
  { name: 'Codeforces', key: 'codeforces' },
  { name: 'LeetCode', key: 'leetcode' },
  { name: 'HackerRank', key: 'hackerrank' }
];

const Dashboard = () => {
  const { token, logout } = useAuth();
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [submitting, setSubmitting] = useState({});

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    fetchProfiles();
  }, [token]);

  const fetchProfiles = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/profiles', {
        headers: { 'x-auth-token': token }
      });
      
      if (!res.data.profiles) {
        throw new Error('Invalid response format');
      }

      const profilesMap = {};
      res.data.profiles.forEach(profile => {
        profilesMap[profile.platform] = {
          username: profile.username || '',
          score: profile.score || 0,
          problemsSolved: profile.problemsSolved || 0,
          rating: profile.rating || 0,
          rank: profile.rank || 'N/A',
          lastUpdated: profile.lastUpdated || null,
          lastUpdateStatus: profile.lastUpdateStatus || 'none'
        };
      });
      setProfiles(profilesMap);
    } catch (err) {
      console.error('Fetch profiles error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch profiles';
      toast.error(errorMsg);
      
      if (err.response?.status === 401) {
        logout();
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (platform) => {
    if (!token) {
      toast.error('Please login to continue');
      window.location.href = '/login';
      return;
    }

    try {
      setSubmitting({ ...submitting, [platform]: true });
      const username = profiles[platform]?.username || '';
      
      if (!username.trim()) {
        toast.error('Username cannot be empty');
        return;
      }

      const response = await axios({
        method: 'post',
        url: `http://localhost:5000/api/profiles/${platform}`,
        data: { username: username.trim() },
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data.success && response.data.profile) {
        toast.success(`${platform} profile verified and saved successfully!`);
        await fetchProfiles();
      } else {
        throw new Error(response.data.message || 'Failed to verify profile');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      
      const errorMsg = err.response?.data?.error || 
                      err.response?.data?.message || 
                      err.message || 
                      'Failed to verify profile';
      
      toast.error(errorMsg);
      
      if (err.response?.status === 401) {
        logout();
        window.location.href = '/login';
      }
    } finally {
      setSubmitting({ ...submitting, [platform]: false });
    }
  };

  const updateScores = async () => {
    if (!token) {
      toast.error('Please login to continue');
      window.location.href = '/login';
      return;
    }

    setUpdating(true);
    try {
      const response = await axios.put(
        'http://localhost:5000/api/profiles/update-scores',
        {},
        { 
          headers: { 'x-auth-token': token },
          timeout: 30000 
        }
      );

      if (response.data.success) {
        toast.success('All scores updated successfully!');
        await fetchProfiles(); 
      } else {
        throw new Error(response.data.message || 'Failed to update scores');
      }
    } catch (err) {
      console.error('Update scores error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update scores';
      toast.error(errorMsg);
      
      if (err.response?.status === 401) {
        logout();
        window.location.href = '/login';
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center">
          Profile Dashboard
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={updateScores}
          disabled={updating}
          sx={{ mb: 4 }}
        >
          {updating ? 'Updating Scores...' : 'Update All Scores'}
        </Button>

        <Grid container spacing={3}>
          {platforms.map((platform) => (
            <Grid item xs={12} sm={6} key={platform.key}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {platform.name}
                  </Typography>
                  <TextField
                    fullWidth
                    label="Username"
                    value={profiles[platform.key]?.username || ''}
                    onChange={(e) =>
                      setProfiles({
                        ...profiles,
                        [platform.key]: {
                          ...profiles[platform.key],
                          username: e.target.value
                        }
                      })
                    }
                    margin="normal"
                    disabled={submitting[platform.key]}
                    error={profiles[platform.key]?.lastUpdateStatus === 'error'}
                    helperText={
                      profiles[platform.key]?.lastUpdateStatus === 'error'
                        ? 'Failed to verify username'
                        : `Enter your ${platform.name} username`
                    }
                  />
                  {profiles[platform.key]?.score > 0 && (
                    <Box sx={{ mt: 1, mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Score: {profiles[platform.key].score}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Problems Solved: {profiles[platform.key].problemsSolved}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Rating: {profiles[platform.key].rating}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Rank: {profiles[platform.key].rank}
                      </Typography>
                    </Box>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSubmit(platform.key)}
                    fullWidth
                    sx={{ mt: 1 }}
                    disabled={submitting[platform.key]}
                  >
                    {submitting[platform.key] ? 'Verifying...' : 'Verify & Save'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
};

export default Dashboard;
