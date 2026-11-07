import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./redesign.css";

// ErrorBoundary กันหน้าขาวเวลามี error ใดๆ
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(err, info){ console.error("App crashed:", err, info); }
  render(){
    if (this.state.error){
      return (
        <div style={{
          padding:16, fontFamily:"-apple-system,Segoe UI,Roboto,Arial", lineHeight:1.5
        }}>
          <h2>มีข้อผิดพลาดในการแสดงผล</h2>
          <pre style={{whiteSpace:"pre-wrap"}}>{String(this.state.error?.message || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);
