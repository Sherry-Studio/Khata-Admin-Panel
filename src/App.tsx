import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./state/auth";
import { Loading } from "./components/ui";
import Login from "./routes/Login";
import Dashboard from "./routes/Dashboard";
import UsersList from "./routes/Users";
import UserDetail from "./routes/UserDetail";
import Audit from "./routes/Audit";
import Broadcast from "./routes/Broadcast";
import Transactions from "./routes/Transactions";

function Protected({ children }: { children: JSX.Element }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<UsersList />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/broadcast" element={<Broadcast />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
