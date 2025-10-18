// src/pages/AdminLogin.jsx
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";


const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [err, setErr]     = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false)


  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      navigate("/");
    } catch (e) {
      setErr(e.code || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold text-black mb-4">Admin Login</h1>

        {err && <p className="text-red-600 text-sm mb-3">{err}</p>}

        <label className="block text-black text-sm mb-1">Email</label>
        <input
          className="w-full border text-black rounded p-2 mb-3"
          type="email" value={email} onChange={e=>setEmail(e.target.value)} required
        />

        <label className="block text-black text-sm mb-1">Password</label>
        <input
          className=" text-black w-full border rounded p-2 mb-4"
          type="password" value={pass} onChange={e=>setPass(e.target.value)} required
        />

        <button
          type="submit"
          className={`w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700
          ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {
          loading ? "Signing in..." : "sign in"
          }
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
