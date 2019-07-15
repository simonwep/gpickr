import {utils} from '@simonwep/pickr';

export default () => utils.createFromTemplate(`
<div data-key="root" class="gpickr">

    <div data-key="pickr"></div>
        
    <div data-con="gradient" class="gpcr-interaction">
    
        <div data-key="result" class="gpcr-result">
            <div data-key="angle" class="gpcr-angle">
                <div data-key="arrow"></div>
            </div>
        </div>
        
        <div data-con="stops" class="gpcr-stops">
            <div data-key="preview" class="gpcr-stop-preview"></div>
            <div data-key="markers" class="gpcr-stop-marker"></div>
        </div>
        
        <div data-con="controls" class="gpcr-controls">
            <button data-key="mode" class="gpcr-mode">Radial</button>
        </div>
    </div>
    
</div>
`)
