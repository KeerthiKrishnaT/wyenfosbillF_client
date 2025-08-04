import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const logoutUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
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
      } catch (error) {
        console.error('Error recording logout:', error);
      } finally {
        localStorage.clear();
        navigate('/login');
      }
    };

    logoutUser();
  }, [navigate]);

  return <div>Logging out...</div>;
};

export default Logout;