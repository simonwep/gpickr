import { utils } from '@simonwep/pickr';

export default () =>
    utils.createFromTemplate(`
<div class="gpickr" :ref="root">

    <div :ref="pickr"></div>
    <div :obj="gradient" class="gpcr-interaction">
    <div :ref="result" class="gpcr-result">
        
         <div :ref="mode" data-mode="linear" class="gpcr-mode"></div>

            <div :ref="angle" class="gpcr-angle">
                <div :ref="arrow"></div>
            </div>

            <div :ref="pos" class="gpcr-pos">
                ${['tl', 'tm', 'tr', 'l', 'm', 'r', 'bl', 'bm', 'br']
                    .map((v) => `<div data-pos="${v}"></div>`)
                    .join('')}
            </div>
        </div>

        <div :obj="stops" class="gpcr-stops">
            <div :ref="preview" class="gpcr-stop-preview"></div>
            <div :ref="markers" class="gpcr-stop-marker"></div>
        </div>
       
    </div>

</div>
`);
