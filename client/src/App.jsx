import { useUploader } from "./hooks/useUploader";
import UploadDashboard from "./components/UploadDashboard";
import { Toaster } from "react-hot-toast";
import MultiUploadDashboard from "./components/MultiUploadDashboard";

export default function App() {
  const uploader = useUploader();

  return (
    <>
      <MultiUploadDashboard {...uploader} />
      <Toaster position="bottom-right" />
    </>
  );
}
