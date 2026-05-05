import { RouterProvider } from "react-router-dom";
import { appRouter } from "./ui/router/routes";

function App() {
  return <RouterProvider router={appRouter} />;
}

export default App;
