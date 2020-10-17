/*
http://jsfiddle.net/realraven2000/rh6k0z34/14/
*/

// add animation to body element (pass 'body' as id)
async function addAnimation(el) {
    var exists = document.getElementById('gimmick')
    if (exists) {
      exists.parentNode.removeChild(exists);
      return false;
    }

    let element = document.querySelector(el),
        canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        focused = false;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.id = 'gimmick'

    var coins = [],
        coin = new Image();
               // 'http://i.imgur.com/5ZW2MT3.png';
    // 440 wide, 40 high, 10 states
    coin.onload = function () {
      element.appendChild(canvas);
      focused = true;
      drawloop();
    }
    coin.src = 'coins-animation-dlr.png';

    function drawloop() {
        if (focused) {
            requestAnimationFrame(drawloop);
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (Math.random() < .3) {
            coins.push({
                x: Math.random() * canvas.width | 0,
                y: -20,
                dy: 3,
                s: 0.5 + Math.random(),
                state: Math.random() * 10 | 0
            })
        }
        var i = coins.length
        while (i--) {
            var x = coins[i].x
            var y = coins[i].y
            var s = coins[i].s
            var state = coins[i].state
            coins[i].state = (state > 9) ? 0 : state + 0.1
            coins[i].dy += 0.13
            coins[i].y += coins[i].dy

            ctx.drawImage(coin, 44 * Math.floor(state), 0, 44, 40, x, y, 44 * s, 40 * s)

            if (y > canvas.height) {
                coins.splice(i, 1);
            }
        }
    }

}
