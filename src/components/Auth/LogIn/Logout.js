import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const logoutUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Record punch-out in backend
          await fetch('http://localhost:5000/api/punching-times/record-logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              punchOut: new Date().toISOString()
            })
          });
        }
        await logout(); // Firebase signOut
      } catch (error) {
        console.error('Error during logout:', error);
      } finally {
        localStorage.clear();
        navigate('/login');
      }
    };
    logoutUser();
  }, [logout, navigate]);

  return <div>Logging out...</div>;
};

export default Logout;