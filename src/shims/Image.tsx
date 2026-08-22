import type {ImgHTMLAttributes} from "react";
type Props=ImgHTMLAttributes<HTMLImageElement>&{fill?:boolean;priority?:boolean;sizes?:string};
export default function Image({fill,priority,...props}:Props){return <img {...props} loading={priority?"eager":props.loading} style={fill?{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",...props.style}:props.style}/>}
