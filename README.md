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

### GPickr Instance / static props
* gpickr.Pickr _- [Pickr](https://github.com/Simonwep/pickr)._
* gpickr.addStop(color`:String`, loc`:Number`) _- Add a color-stop._
* gpickr.removeStop(v`:String|Number|Stop`) _- Remove a color stop by color, location or stop-instance._
* gpickr.getGradient() _- Returns the current gradient as css string._
* gpickr.getStops() _- Array of stop objects with each a `location` between `0` and `1` as well as an `rgba` color value. The `toString` function is overridden and 
returns the array ready-to-use as comma seperated list, useful if a custom direcation / angle want to be used._
* gpickr.getLinearAngle() _- Returns the current selected angle. `-1` if currently in radial-mode_
* gpickr.setLinearAngle(angle`:Number`) _- Applies a new angle to the current linear gradient._
* gpickr.getRadialPosition() _- Returns the current chosen direction. `null` if currently in linear-mode_
* gpickr.setRadialPosition(position`:String`) _- Sets a new position for the current radial-gradient._
* gpickr.on(event`:String`, cb`:Function`) _- Appends an event listener to the given corresponding event-name (see section Events), returns the gpickr instance so it can be chained._
* gpickr.off(event`:String`, cb`:Function`) _- Removes an event listener from the given corresponding event-name (see section Events), returns the gpickr instance so it can be chained._

### Events

| Event          | Description |
| -------------- | ----------- |
| `init`         | Initialization done - gpickr can be used |
| `change`       | User changed the gradient |

> Example:
```js
gpickr.on('init', instance => {
    console.log('init', instance);
}).on('change', instance => {
    console.log('change', instance.getGradient());
});
```
