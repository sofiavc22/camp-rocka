import type {AnchorHTMLAttributes,ReactNode} from "react";
export default function Link({href,children,...props}:{href:string;children:ReactNode}&Omit<AnchorHTMLAttributes<HTMLAnchorElement>,"href">){return <a href={href} {...props}>{children}</a>}
