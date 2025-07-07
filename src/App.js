
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DiveDeep from "./pages/DiveDeep";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/deep-dive" element={<DiveDeep />} />
    </Routes>
  </BrowserRouter>
);

export default App;
