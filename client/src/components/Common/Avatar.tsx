import { getInitials } from "@/utils/getInitials";
import { User } from "lucide-react";

interface AvatarProps {
  userName: string;
}

export default function Avatar({ userName }: AvatarProps) {
  return (
    <>
      <div
        className={`rounded-full p-2 bg-purple-950 border border-purple-500 flex items-center justify-center`}
      >
        {userName ? (
          <span className={` font-bold text-gray-100`}>
            {getInitials(userName)}
          </span>
        ) : (
          <User className={"text-gray-400"} />
        )}
      </div>
    </>
  );
}
