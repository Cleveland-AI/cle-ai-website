import Link from "next/link";
import { Main } from "@/components/Main";
import { SearchForm } from "@/components/SearchForm";
import { Mascot } from "@/blocks/mascot/Mascot";

/** templates/404.html: the lost Dot, a headline, a way back and a search box. */
export function NotFound() {
  return (
    <Main>
      <Mascot pose="lost" width={280} />
      {/* wptexturize curls the template's apostrophe. */}
      <h1 className="wp-block-heading">Dot can’t find that page.</h1>
      <p className="wp-block-paragraph">
        It has moved, or it never existed. Try a search, or <Link href="/">head back to the homepage</Link>.
      </p>
      <SearchForm />
    </Main>
  );
}
