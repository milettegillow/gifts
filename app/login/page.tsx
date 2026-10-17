import { Suspense } from "react";
import { RibbonWrap } from "@/app/ui/ribbon-wrap";
import { LoginFlow } from "./login-flow";

// The wrapped gift, with a tag tied to the bow. New and returning people just
// enter their email.
export default function LoginPage() {
  return (
    <>
      <RibbonWrap mode="static" />
      <div className="gift-tag-anchor">
        <div className="gift-tag">
          <div className="gift-tag-edge">
            <div className="gift-tag-face min-h-[200px] py-5 pr-5 pl-10">
              <Suspense>
                <LoginFlow />
              </Suspense>
            </div>
          </div>
          <span aria-hidden className="gift-tag-hole" />
        </div>
        <span aria-hidden className="gift-tag-string" />
      </div>
    </>
  );
}
