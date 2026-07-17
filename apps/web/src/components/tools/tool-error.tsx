/** Error card shared by the free tools (v4 fixed palette). */
export function ToolError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[#b91c1c]/35 bg-[#fdeaeb] px-5 py-4">
      <p className="text-sm font-medium text-[#b91c1c]" role="alert">
        {message}
      </p>
    </div>
  );
}
