import Dashboard from "./components/Dashboard";

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const shop = urlParams.get("shop") || "";

  return <Dashboard shop={shop} />;
}

export default App;
