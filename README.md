#### Demo: https://simonwep.github.io/gpickr

> This is a demo of how [pickr](https://github.com/Simonwep/pickr) could be implemented / integrated in other scenarios.

#### Usage
```js
const gpickr = new GPickr({
    el: '.gradient-pickr',
    
    // Pre-defined stops. These are the default since at least two should be defined
    stops: [
        ['rgb(255,132,109)', 0],
        ['rgb(255,136,230)', 1]
    ]
})
```

#### GPickr Instance / static props
* gpickr.Pickr _- [Pickr](https://github.com/Simonwep/pickr)._
* gpickr.addStop(color`:String`, loc`:Number`) _- Add a color-stop._
* gpickr.removeStop(v`:String|Number|Stop`) _- Remove a color stop by color, location or stop-instance._
* gpickr.getGradient() _- Returns the current gradient as css string._
* gpickr.getStops() _- Array of stop objects with each a `location` between `0` and `1` as well as an `rgba` color value. The `toString` function is overridden and 
returns the array ready-to-use as comma seperated list, useful if a custom direcation / angle want to be used._
* gpickr.getAngle() _- Returns the current selected angle. `-1` if currently in radial-mode_
* gpickr.setGradient(gradient`:String`) _- Tries to parse a existing gradient string._
