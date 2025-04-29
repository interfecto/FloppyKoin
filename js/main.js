// js/main.js
// ── Floppy Bird with Kondor wallet integration ──

let debugmode = false;

const states = Object.freeze({
  SplashScreen: 0,
  GameScreen:   1,
  ScoreScreen:  2
});
let currentstate;

const gravity    = 0.25;
let velocity     = 0;
let position     = 180;
let rotation     = 0;
const jump       = -4.6;
const flyArea    = $("#flyarea").height();

let score        = 0;
let highscore    = 0;

let pipeheight   = 90;
const pipewidth  = 52;
let pipes        = [];

let replayclickable = false;

// preload sounds - initialize but don't play until user interacts
const volume      = 30;
let soundJump, soundScore, soundHit, soundDie, soundSwoosh;
let soundsLoaded = false;

// Function to initialize sounds only after user interaction
function initSounds() {
  if (soundsLoaded) return;
  
  soundJump   = new buzz.sound("assets/sounds/sfx_wing.ogg");
  soundScore  = new buzz.sound("assets/sounds/sfx_point.ogg");
  soundHit    = new buzz.sound("assets/sounds/sfx_hit.ogg");
  soundDie    = new buzz.sound("assets/sounds/sfx_die.ogg");
  soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
  buzz.all().setVolume(volume);
  
  soundsLoaded = true;
}

let loopGameloop, loopPipeloop;

$(document).ready(function() {
  console.log("🎮 Game initialized!");
  
  // ── Debug / easy flags ──
  if (window.location.search === "?debug") debugmode = true;
  if (window.location.search === "?easy")  pipeheight = 200;

  // ── Load highscore from cookie ──
  const saved = getCookie("highscore");
  if (saved !== "") highscore = parseInt(saved, 10);

  // ── Initial splash ──
  showSplash();

  // ── Wallet UI hookup ──
  const connectBtn  = document.getElementById('connect-btn');
  const addressSpan = document.getElementById('wallet-address');
  const submitBtn   = document.getElementById('submit-score-btn');

  // Prevent wallet UI clicks from affecting the game
  ['mousedown','touchstart','click'].forEach(evt => {
    connectBtn.addEventListener(evt, e => e.stopPropagation());
    submitBtn .addEventListener(evt, e => e.stopPropagation());
  });

  // Connect flow with UI feedback
  connectBtn.addEventListener('click', async e => {
    e.stopPropagation();
    initSounds(); // Initialize sounds on first user interaction
    connectBtn.disabled   = true;
    connectBtn.innerText  = 'Connecting…';
    try {
      await window.connectWallet();
      connectBtn.innerText     = 'Connected';
      addressSpan.style.opacity = 1;
      submitBtn.disabled       = false;
      
      // Get player's previous score from blockchain
      const playerScore = await window.getPlayerScore();
      if (playerScore && playerScore.score > highscore) {
        highscore = playerScore.score;
        setCookie("highscore", highscore, 999);
      }
    } catch (err) {
      console.error('connectWallet failed', err);
      alert('Wallet connect failed — see console');
      connectBtn.innerText = 'Connect Wallet';
      connectBtn.disabled  = false;
    }
  });

  // Configure submit score button
  submitBtn.addEventListener('click', async e => {
    e.stopPropagation();
    if (score > 0) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Submitting...';
      
      try {
        await window.sendScore(score);
        // Refresh the leaderboard after submission
        window.refreshLeaderboard();
        submitBtn.innerText = 'Submitted!';
        setTimeout(() => {
          submitBtn.innerText = 'Submit Score';
          submitBtn.disabled = false;
        }, 3000);
      } catch (err) {
        console.error('Score submission failed', err);
        submitBtn.innerText = 'Submit Failed';
        setTimeout(() => {
          submitBtn.innerText = 'Submit Score';
          submitBtn.disabled = false;
        }, 3000);
      }
    }
  });

  // ── Game click/tap handling ──
  // Remove old global handlers
  $(document).off("mousedown touchstart");

  // Only let clicks *outside* the wallet bar and replay button
  // drive the game. The wallet UI is 50px high, so we can ignore
  // any clientY ≤ walletHeight.
  const walletHeight = document.getElementById('wallet-bar').offsetHeight || 50;
  $(document).on("mousedown touchstart", function(e) {
    initSounds(); // Initialize sounds on first user interaction
    
    // ignore the top wallet bar
    if (e.clientY <= walletHeight) return;
    // ignore the replay button
    if ($(e.target).closest("#replay").length) return;
    // ignore the leaderboard toggle and contents
    if ($(e.target).closest("#leaderboard").length || 
        $(e.target).closest("#leaderboard-toggle").length) return;
    // otherwise flap or start
    screenClick();
  });

  // spacebar works everywhere
  $(document).keydown(function(e) {
    initSounds(); // Initialize sounds on first user interaction
    
    if (e.keyCode === 32) {
      if (currentstate === states.ScoreScreen) {
        $("#replay").click();
      } else {
        screenClick();
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// COOKIE HELPERS
function getCookie(cname) {
  const name = cname + "=";
  const ca   = document.cookie.split(";");
  for (let c of ca) {
    c = c.trim();
    if (c.startsWith(name)) return c.substring(name.length);
  }
  return "";
}
function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + exdays*24*60*60*1000);
  document.cookie = `${cname}=${cvalue};expires=${d.toGMTString()}`;
}

// ─────────────────────────────────────────────────────────────
// SCREENS & LOOPS
function showSplash() {
  currentstate = states.SplashScreen;
  velocity = 0; position = 180; rotation = 0; score = 0;

  $("#player").css({ y:0, x:0 });
  updatePlayer($("#player"));

  if (soundsLoaded) {
    soundSwoosh.stop();
    soundSwoosh.play();
  }

  $(".pipe").remove();
  pipes = [];

  $(".animated")
    .css("animation-play-state","running")
    .css("-webkit-animation-play-state","running");

  $("#splash").transition({ opacity:1 }, 2000, "ease");
  
  // Enable submit button
  document.getElementById('submit-score-btn').disabled = false;
  document.getElementById('submit-score-btn').innerText = 'Submit Score';
}

function startGame() {
  currentstate = states.GameScreen;
  $("#splash").stop().transition({ opacity:0 }, 500, "ease");
  setBigScore();
  if (debugmode) $(".boundingbox").show();

  loopGameloop = setInterval(gameloop, 1000/60);
  loopPipeloop  = setInterval(updatePipes, 1400);
}

function updatePlayer(player) {
  // CSS rotation calculation for up/down rotation
  rotation = Math.min((velocity / 10) * 90, 90);
  
  // Apply CSS updates to the player element
  $(player).css({ 
    rotate: rotation,
    top: position
  });
}

function gameloop() {
  const player = $("#player");
  
  // Update player position & velocity
  velocity += gravity;
  position += velocity;
  
  // Update player in DOM
  updatePlayer(player);
  
  // Create hit boxes for hit detection
  const box = document.getElementById('playerbox');
  
  // Handle the player being below the floor 
  const boundingRect = player.get(0).getBoundingClientRect();
  const bottom = boundingRect.bottom;
  const ceiling = $("#ceiling").offset().top + $("#ceiling").height();
  const floor = $("#land").offset().top;
  
  // Apply hit detection between:
  // - player / floor
  // - player / ceiling
  // - player / pipes (passed to each pipe)
  if (bottom >= floor) {
    playerDead();
    return;
  } else if (boundingRect.top <= ceiling) {
    position = 0;
    velocity = 0;
  }
  
  // If we're in debug mode, update the debug box
  if (debugmode) {
    const boundingbox = $("#playerbox");
    boundingbox.css({
      left: boundingRect.left,
      top: boundingRect.top,
      height: boundingRect.height,
      width: boundingRect.width
    });
  }
  
  // Check for a pipe collision
  const origwidth = 34.0;
  const origheight = 24.0;
  
  // ...for each pipe
  if (pipes && Array.isArray(pipes) && pipes.length > 0) {
    for (let i = 0; i < pipes.length; i++) {
      const pipe = pipes[i];
      // intersection check
      const pipeRects = pipe.getBoundingRect();
      if (boundingRect.right > pipeRects.left) {
        if (boundingRect.left < pipeRects.right) {
          if (boundingRect.bottom > pipeRects.top && boundingRect.top < pipeRects.bottom) {
            playerDead();
            return;
          }
        }
      }
      
      // Score when player passes a pipe
      if (pipe.passed === false && pipeRects.right < boundingRect.left) {
        pipe.passed = true;
        playerScore();
      }
    }
  }
}

function screenClick() {
  if (currentstate === states.GameScreen) {
    playerJump();
  } else if (currentstate === states.SplashScreen) {
    startGame();
  }
}

function playerJump() {
  velocity = jump;
  if (soundsLoaded) {
    soundJump.stop();
    soundJump.play();
  }
}

function playerDead() {
  $(".animated")
    .css("animation-play-state", "paused")
    .css("-webkit-animation-play-state", "paused");
  
  // Drop the bird to the floor
  const playerbottom = $("#player").position().top + $("#player").width();
  const floor = flyArea;
  const movey = Math.max(0, floor - playerbottom);
  
  // Alert sounds - fixed to not use Promise chain
  if (soundsLoaded) {
    soundHit.play();
    soundDie.play();
  }
  
  // Final game cycle for death animation
  $("#player").transition({ y: movey + 'px', rotate: 90 }, 1000, 'easeInOutCubic');
  currentstate = states.ScoreScreen;
  
  // Stop game loops
  clearInterval(loopGameloop);
  clearInterval(loopPipeloop);
  loopGameloop = null;
  loopPipeloop = null;
  
  // Update score display
  if (score > highscore) {
    highscore = score;
    setCookie("highscore", highscore, 999);
  }
  
  // Show score board
  showScore();
}

function showScore() {
  $("#scoreboard").css("display", "block");
  
  // Update score displays
  setSmallScore();
  setHighScore();
  
  // Determine which medal to award
  setMedal();
  
  const goneUp = (score >= highscore);
  const height = goneUp ? 85 : 60;
  
  // Prepare for transition animations
  $("#scoreboard").transition({ y: '40px', opacity: 0 }, 
    0, function() {
      $(this).css("y", "-" + height + "px");
      $(this).transition({ y: '0px', opacity: 1 }, 600, 'ease', 
        function() {
          if (soundsLoaded) {
            soundSwoosh.stop();
            soundSwoosh.play();
          }
          
          // Show the medal with a slight delay
          $("#medal").css({ scale: 2, opacity: 0 });
          $("#medal").transition({ scale: 1, opacity: 1 }, 1200, 'ease');
          
          // Make the replay button visible and clickable
          $("#replay").css({opacity: 0});
          $("#replay").transition({opacity: 1}, 600, 'ease');
          
          // Activate replay button after a delay
          replayclickable = false;
          setTimeout(function() {
            replayclickable = true;
          }, 500);
          
          // Bind the replay button
          $("#replay").off("click touchstart");
          $("#replay").on("click touchstart", function() {
            if (!replayclickable) return;
            if (soundsLoaded) {
              soundSwoosh.stop();
              soundSwoosh.play();
            }
            $("#scoreboard").transition({ y: '-40px', opacity: 0 }, 1000, 'ease', 
              function() {
                $(this).css("display", "none");
                showSplash();
              });
          });
        });
    });
}

function playerScore() {
  score++;
  if (soundsLoaded) {
    soundScore.stop();
    soundScore.play();
  }
  setBigScore();
}

function updatePipes() {
  // Do any pipes need removal?
  $(".pipe").filter(function() { 
    return $(this).position().left <= -100; 
  }).remove();
  
  // Add a new pipe
  const padding = 80;
  const constraint = flyArea - pipeheight - (padding * 2);
  const topheight = Math.floor((Math.random() * constraint) + padding);
  const bottomheight = (flyArea - pipeheight) - topheight;
  const newpipe = $('<div class="pipe animated">' +
    '<div class="pipe_upper" style="height: ' + topheight + 'px;"></div>' +
    '<div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div>' +
    '</div>');
  
  // Set initial position and a unique ID
  newpipe.css("left", 900);
  
  // Attach & store new pipe
  $("#flyarea").append(newpipe);
  pipes.push({
    // Store pipe's position for collision detection
    getBoundingRect: function() {
      const pipeOffset = newpipe.offset();
      const top = pipeOffset.top;
      const bottom = top + pipeheight;
      const left = pipeOffset.left;
      const right = left + pipewidth;
      // and track if we've already scored on this pipe
      return { top: top, bottom: bottom, left: left, right: right };
    },
    passed: false
  });
}

function setBigScore(erase) {
  const elemscore = $("#bigscore");
  elemscore.empty();
  
  if (erase) return;
  
  const digits = score.toString().split('');
  for (let i = 0; i < digits.length; i++)
    elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setSmallScore() {
  const elemscore = $("#currentscore");
  elemscore.empty();
  
  const digits = score.toString().split('');
  for (let i = 0; i < digits.length; i++)
    elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setHighScore() {
  const elemscore = $("#highscore");
  elemscore.empty();
  
  const digits = highscore.toString().split('');
  for (let i = 0; i < digits.length; i++)
    elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setMedal() {
  const elemmedal = $("#medal");
  elemmedal.empty();
  
  if (score < 10) // no medal
    return;
  
  if (score < 20) // bronze
    elemmedal.append('<img src="assets/medal_bronze.png" alt="Bronze">');
  else if (score < 30) // silver
    elemmedal.append('<img src="assets/medal_silver.png" alt="Silver">');
  else if (score < 40) // gold
    elemmedal.append('<img src="assets/medal_gold.png" alt="Gold">');
  else // platinum
    elemmedal.append('<img src="assets/medal_platinum.png" alt="Platinum">');
}
