// Full-screen overlay menu on phones. Closes on Escape, the close button, a link, or a tap
// on the overlay background.
document.querySelectorAll( '.wp-block-cle-nav' ).forEach( function ( nav ) {
	var open = nav.querySelector( '.cle-nav__open' );
	var panel = nav.querySelector( '.cle-nav__panel' );
	var close = nav.querySelector( '.cle-nav__close' );

	function setOpen( isOpen ) {
		panel.classList.toggle( 'is-open', isOpen );
		document.body.classList.toggle( 'cle-nav-is-open', isOpen );
		open.setAttribute( 'aria-expanded', String( isOpen ) );
		if ( isOpen ) {
			close.focus();
		} else {
			open.focus();
		}
	}

	open.addEventListener( 'click', function () { setOpen( true ); } );
	close.addEventListener( 'click', function () { setOpen( false ); } );
	panel.addEventListener( 'click', function ( e ) {
		if ( e.target === panel || e.target.closest( 'a' ) ) {
			if ( panel.classList.contains( 'is-open' ) ) {
				setOpen( false );
			}
		}
	} );
	document.addEventListener( 'keydown', function ( e ) {
		if ( 'Escape' === e.key ) {
			if ( panel.classList.contains( 'is-open' ) ) {
				setOpen( false );
			}
		}
	} );
} );
