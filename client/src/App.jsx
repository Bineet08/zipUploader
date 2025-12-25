import { useUploader } from "./hooks/useUploader";
import UploadDashboard from "./components/UploadDashboard";
import { Toaster } from "react-hot-toast";

export default function App() {
  const uploader = useUploader();

  return (
    <>
      <UploadDashboard {...uploader} />
      <Toaster position="bottom-right" />
    </>
  );
}
