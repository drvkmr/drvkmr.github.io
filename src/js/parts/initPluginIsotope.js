import { $, $doc } from './_utility';

function initPluginIsotope() {
    if ( 'undefined' === typeof $.fn.isotope ) {
        return;
    }

    $( '.isotope' ).each( function () {
        const $this = $( this );
        const curIsotopeOptions = $this.find( '.isotope-options' );
        const dataMode = $this.attr( 'data-isotope-mode' );
        const conf = {};

        conf.itemSelector = '.isotope-item';

        if ( dataMode ) {
            conf.layoutMode = dataMode;
        }

        const $grid = $this.find( '.isotope-grid' ).isotope( conf );

        // Function to trigger proper isotope relayout
        const triggerRelayout = () => {
            // Reset any height constraints that might interfere with natural layout
            $grid.find('.isotope-item').css('height', 'auto');
            
            // Trigger isotope layout recalculation
            $grid.isotope('layout');
        };

        // Initial layout after images are loaded
        if ( $grid.imagesLoaded ) {
            $grid.imagesLoaded().done(() => {
                triggerRelayout();
            });
        }

        // Multiple attempts to ensure proper layout after content loads
        // This addresses the initial load issue where descriptions affect layout
        $(document).ready(() => {
            setTimeout(triggerRelayout, 100);
        });

        $(window).on('load', () => {
            setTimeout(triggerRelayout, 100);
            setTimeout(triggerRelayout, 500);
            setTimeout(triggerRelayout, 1000);
        });

        // Handle filter changes
        curIsotopeOptions.on( 'click', '> :not(.active) > a', function ( e ) {
            e.preventDefault();
            
            const $thisLink = $( this );
            $thisLink.parent().addClass( 'active' ).siblings().removeClass( 'active' );
            const curFilter = $thisLink.attr( 'data-filter' );
            
            $doc.trigger( 'isotopeChangeFilter' );
            
            // Apply the filter
            if (curFilter === 'all') {
                $grid.isotope({ filter: '*' });
            } else {
                $grid.isotope({ filter: '[data-filters*="' + curFilter + '"]' });
            }
            
            // Relayout after filter animation completes
            $grid.one('arrangeComplete', () => {
                setTimeout(triggerRelayout, 100);
            });
        });

        // Handle window resize
        let resizeTimeout;
        $( window ).on( 'resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(triggerRelayout, 250);
        });

        // Handle any dynamic content changes that might affect layout
        // This helps when content is loaded dynamically or when fonts finish loading
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                setTimeout(triggerRelayout, 100);
            });
        }
    });
}

export default initPluginIsotope;
