// Team cards: tapping someone's photo or name opens their card as a modal. It springs out of
// where you tapped, with a little confetti; Escape, the ×, or a tap outside closes it, and focus
// goes back to the photo. "Meet …" swaps straight to the next person's card.
document.querySelectorAll( '.cle-team-cards' ).forEach( function ( list ) {
	var calm = window.matchMedia( '(prefers-reduced-motion: reduce)' );

	function open( dialog, from ) {
		if ( ! dialog || typeof dialog.showModal !== 'function' ) {
			return;
		}
		// Spring out of the tapped photo: the card starts at that point and grows to the centre.
		if ( from ) {
			var r = from.getBoundingClientRect();
			dialog.style.setProperty( '--from-x', ( r.left + r.width / 2 - window.innerWidth / 2 ) + 'px' );
			dialog.style.setProperty( '--from-y', ( r.top + r.height / 2 - window.innerHeight / 2 ) + 'px' );
		} else {
			dialog.style.removeProperty( '--from-x' );
			dialog.style.removeProperty( '--from-y' );
		}
		dialog.showModal();
		document.documentElement.classList.add( 'cle-modal-open' );
		var photo = dialog.querySelector( '.cle-team-modal__photo' );
		if ( photo && window.cleConfetti && ! calm.matches ) {
			setTimeout( function () { window.cleConfetti( photo ); }, 260 );
		}
	}

	list.querySelectorAll( '.cle-team-card__open' ).forEach( function ( btn ) {
		btn.addEventListener( 'click', function () {
			open( document.getElementById( btn.getAttribute( 'aria-controls' ) ), btn );
		} );
	} );

	list.querySelectorAll( '.cle-team-modal' ).forEach( function ( dialog ) {
		dialog.addEventListener( 'close', function () {
			document.documentElement.classList.remove( 'cle-modal-open' );
		} );
		dialog.addEventListener( 'click', function ( e ) {
			// A tap on the backdrop (the dialog itself, outside the card) closes it.
			if ( e.target === dialog || e.target.closest( '[data-close]' ) ) {
				dialog.close();
			}
		} );
		var next = dialog.querySelector( '[data-next]' );
		if ( next ) {
			next.addEventListener( 'click', function () {
				var to = document.getElementById( next.dataset.next );
				var back = list.querySelector( '[aria-controls="' + to.id + '"]' );
				dialog.close();
				open( to, null );
				// When this one closes, return focus to that person's photo, not the first one's
				// (after the browser's own focus restore, which would pick the first).
				to.addEventListener( 'close', function () {
					setTimeout( function () { back && back.focus(); }, 0 );
				}, { once: true } );
			} );
		}
	} );
} );
