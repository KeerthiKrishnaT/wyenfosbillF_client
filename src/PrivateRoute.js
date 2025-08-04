import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  console.log('PrivateRoute token:', token);
  if (!token) {
    console.log('No token, redirecting to /login');
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default PrivateRoute;