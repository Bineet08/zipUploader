import UploadDashboard from "./components/UploadDashboard";
import React from 'react'
import { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <div>
      <UploadDashboard />
      <Toaster />
    </div>
  )
}

export default App
