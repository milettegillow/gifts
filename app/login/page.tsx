import { Suspense } from "react";
import { RibbonWrap } from "@/app/ui/ribbon-wrap";
import { LoginFlow } from "./login-flow";

// The wrapped gift, with a tag tied to the bow. New and returning people just
// enter their email.
export default function LoginPage() {
  return (
    <RibbonWrap mode="static" tagString>
      <div className="gift-tag">
        <div className="gift-tag-edge">
          <div className="gift-tag-face">
            <Suspense>
              <LoginFlow />
            </Suspense>
          </div>
          <span aria-hidden className="gift-tag-face-string" />
        </div>
        <span aria-hidden className="gift-tag-hole" />
      </div>
    </RibbonWrap>
  );
}
