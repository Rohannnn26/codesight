import Logout from "@/modules/auth/components/logout";
import { requireAuth } from "@/modules/auth/utils/auth-utils";

export default async function Home() {
  await requireAuth()
  return (
    <div className="flex flex-col items-center justify-center h-screen"> 
      <Logout />
    </div>
  );
}
