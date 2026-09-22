import type { Metadata } from "next";
import "./globals.css";
import {SiteHeader} from "@/components/SiteHeader";
import {SiteFooter} from "@/components/SiteFooter";
export const metadata:Metadata={metadataBase:new URL("https://www.dweeptulika.in"),title:{default:"Dweep Tulika — A Truthful & Unbiased Perspective",template:"%s | Dweep Tulika"},description:"Dweep Tulika — island-centric news, public affairs, culture and stories from Andaman & Nicobar Islands.",alternates:{canonical:"/"},openGraph:{siteName:"Dweep Tulika",type:"website",locale:"en_IN"},robots:{index:true,follow:true,googleBot:{index:true,follow:true,"max-image-preview":"large","max-snippet":-1,"max-video-preview":-1}}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><SiteHeader/><main>{children}</main><SiteFooter/></body></html>}