import { Appbar } from "@/components/Appbar";
import { Dashboard } from "@/components/Dashboard";
import { Hero } from "@/components/Hero";
import { Upload } from "@/components/Upload";

export default function Home() {

  return (
    <>
      <Appbar/>
      <Hero/>
      <Upload/>
      <Dashboard/>
    </>
  );
}
