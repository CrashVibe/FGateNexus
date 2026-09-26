export const PanelHeader = ({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) => (
  <div className="flex items-center justify-between border-b px-4 py-3">
    <h2 className="text-sm font-semibold">{title}</h2>
    <span className="text-muted-foreground text-xs">{hint}</span>
  </div>
);
