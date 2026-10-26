import { initials } from "@/lib/constants";

export default function Avatar({
  name, image, className = "av", style,
}: { name: string; image?: string | null; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={className} style={style} aria-hidden="true">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" referrerPolicy="no-referrer" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
