document.querySelectorAll( '.wp-block-cle-ticker' ).forEach( function ( ticker ) {
	var button = ticker.querySelector( '.cle-ticker__toggle' );
	var pauseLabel = button.textContent;
	button.addEventListener( 'click', function () {
		var paused = ticker.classList.toggle( 'is-paused' );
		button.textContent = paused ? button.dataset.play : pauseLabel;
	} );
} );
