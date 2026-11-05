/** The theme's core/search block (label hidden, button "Search"), as the 404 and search templates use it. */
export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  const id = "wp-block-search__input-2"; // the header's search is -1
  return (
    <form role="search" method="get" action="/search" className="wp-block-search__button-outside wp-block-search__text-button wp-block-search">
      <label className="wp-block-search__label screen-reader-text" htmlFor={id}>
        Search
      </label>
      <div className="wp-block-search__inside-wrapper">
        <input className="wp-block-search__input" id={id} placeholder="" defaultValue={defaultValue} type="search" name="q" required />
        <button aria-label="Search" className="wp-block-search__button wp-element-button" type="submit">
          Search
        </button>
      </div>
    </form>
  );
}
