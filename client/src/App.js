import logo from './logo.svg';
import { Routes, Route } from 'react-router-dom';
import Main from "./pages/main.jsx";
import Admin from "./pages/admin.jsx";
import User from "./pages/user.jsx";
import './App.css';

function App() {
  return (
    <Routes>
      {/* 메인 페이지 */}
      <Route path="/" element={<Main />} />
      {/* 사용자 페이지 */}
      <Route path="/user" element={<User />} />     
      {/* 정부 페이지 */}
      <Route path="/admin" element={<Admin />} /> 
    </Routes>
  );
}

export default App;
