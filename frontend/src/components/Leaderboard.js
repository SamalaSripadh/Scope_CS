import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Alert,
  useTheme,
  useMediaQuery,
  Card,
  Avatar,
  Grid
} from '@mui/material';
import { ArrowUpward, ArrowDownward, EmojiEvents, School } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const departments = [
  'ALL', 'CSE', 'CSC', 'CSD', 'ECE', 'IT', 'CSM', 'CSIT', 'AERO', 'MECH', 'OTHER'
];

const platforms = {
  geeksforgeeks: 'GeeksforGeeks',
  leetcode: 'LeetCode',
  hackerrank: 'HackerRank',
  codechef: 'CodeChef',
  codeforces: 'CodeForces'
};

const platformColors = {
  geeksforgeeks: '#2f8d46',
  leetcode: '#ffa116',
  hackerrank: '#00ab6c',
  codechef: '#5b4638',
  codeforces: '#1f8acb'
};

const getInitials = (name) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

const Leaderboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [section, setSection] = useState('All');
  const [graduatingYear, setGraduatingYear] = useState('All');
  const [gender, setGender] = useState('All');
  const [sortBy, setSortBy] = useState('totalScore');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchLeaderboard();
  }, [department, section, graduatingYear, gender, sortBy, sortOrder]);

  const fetchLeaderboard = async () => {
    try {
      setError('');
      setLoading(true);

      const params = new URLSearchParams({
        sortBy,
        order: sortOrder,
        ...(department !== 'ALL' && { department }),
        ...(section !== 'All' && { section }),
        ...(graduatingYear !== 'All' && { graduatingYear }),
        ...(gender !== 'All' && { gender })
      });

      const res = await axios.get(`http://localhost:5000/api/leaderboard?${params}`, {
        headers: { 'x-auth-token': token }
      });

      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch leaderboard');
      }

      const usersWithRanks = res.data.users.map((user, index) => ({
        ...user,
        overallRank: index + 1
      }));

      const departmentRanks = {};
      departments.forEach(dept => {
        if (dept !== 'ALL') {
          const deptUsers = usersWithRanks.filter(u => u.department === dept);
          deptUsers.forEach((user, index) => {
            if (!departmentRanks[user._id]) departmentRanks[user._id] = {};
            departmentRanks[user._id][dept] = index + 1;
          });
        }
      });

      const usersWithAllRanks = usersWithRanks.map(user => ({
        ...user,
        departmentRank: departmentRanks[user._id]?.[user.department] || '-'
      }));

      setUsers(usersWithAllRanks);
      setFilteredUsers(usersWithAllRanks);
    } catch (err) {
      console.error('Leaderboard error:', err);
      const message = err.response?.data?.message || err.message || 'Failed to fetch leaderboard';
      setError(message);
      toast.error(message);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    if (department !== 'ALL') {
      filtered = filtered.filter(user => user.department === department);
    }
    if (section !== 'All') {
      filtered = filtered.filter(user => user.section === section);
    }
    if (graduatingYear !== 'All') {
      filtered = filtered.filter(user => user.graduatingYear === parseInt(graduatingYear));
    }
    if (gender !== 'All') {
      filtered = filtered.filter(user => user.gender === gender);
    }

    filtered.sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];

      if (sortOrder === 'desc') {
        return valueB - valueA;
      }
      return valueA - valueB;
    });

    setFilteredUsers(filtered);
  };

  const handleFilterChange = (event) => {
    switch (event.target.name) {
      case 'department':
        setDepartment(event.target.value);
        break;
      case 'section':
        setSection(event.target.value);
        break;
      case 'graduatingYear':
        setGraduatingYear(event.target.value);
        break;
      case 'gender':
        setGender(event.target.value);
        break;
      default:
        break;
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  const TopThreeCard = ({ user, rank }) => {
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    return (
      <Card
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${colors[rank - 1]}22, #ffffff)`,
          border: `2px solid ${colors[rank - 1]}44`,
          borderRadius: '16px',
          position: 'relative',
          overflow: 'visible',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        <EmojiEvents
          sx={{
            position: 'absolute',
            top: -20,
            color: colors[rank - 1],
            fontSize: 40
          }}
        />
        <Avatar
          sx={{
            width: 60,
            height: 60,
            bgcolor: theme.palette.primary.main,
            fontSize: '1.5rem',
            mt: 2
          }}
        >
          {getInitials(user.name)}
        </Avatar>
        <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
          {user.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user.department}
        </Typography>
        <Typography variant="h5" sx={{ mt: 1, fontWeight: 600, color: theme.palette.primary.main }}>
          {user.totalScore}
        </Typography>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <School sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 600 }}>
            Leaderboard
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary">
          MLRIT's Top Competitive Programmers
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {users.length > 0 && users.slice(0, 3).length === 3 && (
        <Box sx={{ mb: 6, mt: 4 }}>
          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} sm={4}>
              <TopThreeCard user={users[1]} rank={2} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TopThreeCard user={users[0]} rank={1} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TopThreeCard user={users[2]} rank={3} />
            </Grid>
          </Grid>
        </Box>
      )}

      <Paper 
        elevation={3} 
        sx={{ 
          p: 3,
          borderRadius: '16px',
          background: 'linear-gradient(to bottom right, #ffffff, #f8f9fa)'
        }}
      >
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={department}
              label="Department"
              onChange={(e) => handleFilterChange({ target: { name: 'department', value: e.target.value } })}
              sx={{ borderRadius: '8px' }}
            >
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Section</InputLabel>
            <Select
              value={section}
              label="Section"
              onChange={(e) => handleFilterChange({ target: { name: 'section', value: e.target.value } })}
              sx={{ borderRadius: '8px' }}
            >
              {['All', 'None', 'A', 'B', 'C', 'D', 'E', 'F', 'G'].map((section) => (
                <MenuItem key={section} value={section}>{section}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Graduating Year</InputLabel>
            <Select
              value={graduatingYear}
              label="Graduating Year"
              onChange={(e) => handleFilterChange({ target: { name: 'graduatingYear', value: e.target.value } })}
              sx={{ borderRadius: '8px' }}
            >
              {[...Array.from({ length: 7 }, (_, i) => new Date().getFullYear() + i), 'All'].map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Gender</InputLabel>
            <Select
              value={gender}
              label="Gender"
              onChange={(e) => handleFilterChange({ target: { name: 'gender', value: e.target.value } })}
              sx={{ borderRadius: '8px' }}
            >
              {['All', 'Male', 'Female'].map((gender) => (
                <MenuItem key={gender} value={gender}>{gender}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('name')}>
                    Name <SortIcon field="name" />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('department')}>
                    Department <SortIcon field="department" />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('section')}>
                    Section <SortIcon field="section" />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('graduatingYear')}>
                    Graduating Year <SortIcon field="graduatingYear" />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('gender')}>
                    Gender <SortIcon field="gender" />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('totalScore')}>
                    Total Score <SortIcon field="totalScore" />
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip title="CodeChef">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                        CodeChef
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Typography variant="caption">Score</Typography>
                        <Typography variant="caption">Rating</Typography>
                        <Typography variant="caption">Stars</Typography>
                      </Box>
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('leetcodeScore')}>
                    <Typography variant="subtitle2" color={platformColors.leetcode}>
                      LeetCode Score <SortIcon field="leetcodeScore" />
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('hackerrankScore')}>
                    <Typography variant="subtitle2" color={platformColors.hackerrank}>
                      HackerRank Score <SortIcon field="hackerrankScore" />
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('codeforcesScore')}>
                    <Typography variant="subtitle2" color={platformColors.codeforces}>
                      CodeForces Score <SortIcon field="codeforcesScore" />
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('departmentRank')}>
                    Department Rank <SortIcon field="departmentRank" />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => handleSort('overallRank')}>
                    Overall Rank <SortIcon field="overallRank" />
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} align="center">
                    <Typography variant="body1" sx={{ py: 3 }}>
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => (
                  <TableRow 
                    key={user._id}
                    sx={{
                      backgroundColor: index < 3 ? `${['gold', 'silver', 'bronze'][index]}11` : 'inherit',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {index < 3 && (
                          <EmojiEvents 
                            sx={{ 
                              color: ['#FFD700', '#C0C0C0', '#CD7F32'][index],
                              mr: 1
                            }} 
                          />
                        )}
                        {index + 1}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            mr: 1,
                            bgcolor: theme.palette.primary.main,
                            fontSize: '0.875rem'
                          }}
                        >
                          {getInitials(user.name)}
                        </Avatar>
                        {user.name || 'N/A'}
                      </Box>
                    </TableCell>
                    <TableCell>{user.department || 'N/A'}</TableCell>
                    <TableCell>{user.section || 'N/A'}</TableCell>
                    <TableCell>{user.graduatingYear || 'N/A'}</TableCell>
                    <TableCell>{user.gender || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600,
                          color: theme.palette.primary.main
                        }}
                      >
                        {user.totalScore || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 3, 
                        justifyContent: 'space-between',
                        '& > *': { flex: 1, textAlign: 'center' }
                      }}>
                        <Typography variant="body2" color={platformColors.codechef}>
                          {user.codechefScore || 0}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color={platformColors.codechef} 
                          sx={{ fontWeight: 'bold' }}
                        >
                          {user.codechefRating || 0}
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: 0.5 
                        }}>
                          <Typography variant="body2" color={platformColors.codechef}>
                            {user.codechefStars || 1}
                          </Typography>
                          <span style={{ color: '#FFD700', fontSize: '1.2em' }}>★</span>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: platformColors.leetcode,
                          fontWeight: user.leetcodeScore > 0 ? 600 : 400
                        }}
                      >
                        {user.leetcodeScore || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: platformColors.hackerrank,
                          fontWeight: user.hackerrankScore > 0 ? 600 : 400
                        }}
                      >
                        {user.hackerrankScore || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: platformColors.codeforces,
                          fontWeight: user.codeforcesScore > 0 ? 600 : 400
                        }}
                      >
                        {user.codeforcesScore || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.departmentRank}</TableCell>
                    <TableCell>{user.overallRank}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default Leaderboard;