// js/main.js
// ── Floppy Bird with Kondor wallet integration ──

import { connectWallet, sendScore, getPlayerScore } from './wallet.js';
import { refreshLeaderboard } from './leaderboard.js';

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

// preload sounds
const volume      = 30;
const soundJump   = new buzz.sound("assets/sounds/sfx_wing.ogg");
const soundScore  = new buzz.sound("assets/sounds/sfx_point.ogg");
const soundHit    = new buzz.sound("assets/sounds/sfx_hit.ogg");
const soundDie    = new buzz.sound("assets/sounds/sfx_die.ogg");
const soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);

let loopGameloop, loopPipeloop;

$(document).ready(function() {
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
    connectBtn.disabled   = true;
    connectBtn.innerText  = 'Connecting…';
    try {
      await connectWallet();
      connectBtn.innerText     = 'Connected';
      addressSpan.style.opacity = 1;
      submitBtn.disabled       = false;
      
      // Get player's previous score from blockchain
      const playerScore = await getPlayerScore();
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
        await sendScore(score);
        // Refresh the leaderboard after submission
        refreshLeaderboard();
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

  soundSwoosh.stop().play();

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

  playerJump();
}

// ─────────────────────────────────────────────────────────────
// RENDER & UPDATE
function updatePlayer($p) {
  rotation = Math.min((velocity/10)*90, 90);
  $p.css({ rotate:rotation, top:position });
}

function gameloop() {
  const $p = $("#player");
  velocity += gravity;
  position += velocity;
  updatePlayer($p);

  const box = $p[0].getBoundingClientRect();
  const w   = 34 - Math.sin(Math.abs(rotation)/90)*8;
  const h   = (24 + box.height)/2;
  const left   = ((box.width - w)/2) + box.left;
  const top    = ((box.height - h)/2) + box.top;
  const right  = left + w;
  const bottom = top + h;

  if (debugmode) {
    $("#playerbox").css({ left, top, width:w, height:h });
  }

  // ground
  if (box.bottom >= $("#land").offset().top) {
    return playerDead();
  }
  // ceiling
  if (top <= $("#ceiling").offset().top + $("#ceiling").height()) {
    position = 0;
  }
  if (!pipes[0]) return;

  // next pipe
  const nxt    = pipes[0];
  const upEl   = nxt.children(".pipe_upper");
  const pTop   = upEl.offset().top + upEl.height();
  const pLeft  = upEl.offset().left - 2;
  const pRight = pLeft + pipewidth;
  const pBot   = pTop + pipeheight;

  if (debugmode) {
    $("#pipebox").css({ left:pLeft, top:pTop, width:pipewidth, height:pipeheight });
  }

  if (right > pLeft && !(top > pTop && bottom < pBot)) {
    return playerDead();
  }
  if (left > pRight) {
    pipes.shift();
    playerScore();
  }
}

// ─────────────────────────────────────────────────────────────
// INPUT
function screenClick() {
  if (currentstate === states.GameScreen)      playerJump();
  else if (currentstate === states.SplashScreen) startGame();
}

// ─────────────────────────────────────────────────────────────
// ACTIONS
function playerJump() {
  velocity = jump;
  soundJump.stop().play();
}

function playerDead() {
  $(".animated")
    .css("animation-play-state","paused")
    .css("-webkit-animation-play-state","paused");

  const pb    = $("#player").position().top + $("#player").width();
  const moveY = Math.max(0, flyArea - pb);

  $("#player").transition({ y:moveY+"px", rotate:90 }, 1000, "easeInOutCubic");
  currentstate = states.ScoreScreen;
  clearInterval(loopGameloop);
  clearInterval(loopPipeloop);

  if (isIncompatible.any()) {
    showScore();
  } else {
    soundHit.play().bindOnce("ended", () => soundDie.play().bindOnce("ended", showScore));
  }
}

function showScore() {
  $("#gameover").css({ opacity:0, y:"-20px" }).removeClass("splash");

  // update the scoreboard
  setBigScore(true);
  
  if(score > highscore){
    highscore = score;
    setCookie("highscore", highscore, 999);
  }

  setSmallScore();
  setHighScore();
  const won = setMedal();

  soundSwoosh.stop().play();

  $("#scoreboard")
    .css({ y:"40px", opacity:0 })
    .transition({ y:"0px", opacity:1 }, 600, "ease", function(){
      soundSwoosh.play();
      $("#replay").css({ y:"40px", opacity:0 })
                   .transition({ y:"0px", opacity:1 }, 600, "ease");
      if (won) {
        $("#medal").css({ scale:2, opacity:0 })
                   .transition({ scale:1, opacity:1 }, 1200, "ease");
      }
    });

  // enable on‑chain submission
  $("#submit-score-btn")
    .prop("disabled", false)
    .off("click")
    .on("click", () => window.submitScoreToChain(score));

  replayclickable = true;
}

// ─────────────────────────────────────────────────────────────
// REPLAY HANDLER
$("#replay").click(function() {
  if (!replayclickable) return;
  replayclickable = false;

  soundSwoosh.stop().play();
  $("#scoreboard")
    .transition({ y:"-40px", opacity:0 }, 1000, "ease", function(){
      $(this).css("display","none");
      showSplash();
      startGame();
    });
});

// ─────────────────────────────────────────────────────────────
// SCORING & PIPES
function playerScore() {
  score++;
  soundScore.stop().play();
  setBigScore();
}

function updatePipes() {
  $(".pipe").filter(function(){
    return $(this).position().left <= -100;
  }).remove();

  const pad = 80;
  const ctr = flyArea - pipeheight - (pad*2);
  const tH  = Math.floor(Math.random()*ctr + pad);
  const bH  = (flyArea - pipeheight) - tH;

  const $pl = $(`
    <div class="pipe animated">
      <div class="pipe_upper" style="height:${tH}px"></div>
      <div class="pipe_lower" style="height:${bH}px"></div>
    </div>
  `);
  $("#flyarea").append($pl);
  pipes.push($pl);
}

// ─────────────────────────────────────────────────────────────
// MEDALS
function setBigScore(erase) {
  const $b = $("#bigscore").empty();
  if (erase) return;
  score.toString().split("").forEach(d => {
    $b.append(`<img src="assets/font_big_${d}.png" alt="${d}">`);
  });
}
function setSmallScore() {
  const $c = $("#currentscore").empty();
  score.toString().split("").forEach(d => {
    $c.append(`<img src="assets/font_small_${d}.png" alt="${d}">`);
  });
}
function setHighScore() {
  const $h = $("#highscore").empty();
  highscore.toString().split("").forEach(d => {
    $h.append(`<img src="assets/font_small_${d}.png" alt="${d}">`);
  });
}
function setMedal() {
  const $m = $("#medal").empty();
  let md;
  if (score < 10) return false;
  if (score >= 10) md="bronze";
  if (score >= 20) md="silver";
  if (score >= 30) md="gold";
  if (score >= 40) md="platinum";
  $m.append(`<img src="assets/medal_${md}.png" alt="${md}">`);
  return true;
}

// ─────────────────────────────────────────────────────────────
// INCOMPATIBILITY
const isIncompatible = {
  Android:    function() { return /Android/i.test(navigator.userAgent); },
  BlackBerry: function() { return /BlackBerry/i.test(navigator.userAgent); },
  iOS:        function() { return /iPhone|iPad|iPod/i.test(navigator.userAgent); },
  Opera:      function() { return /Opera Mini/i.test(navigator.userAgent); },
  Safari:     function() { return /OS X.*Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent); },
  Windows:    function() { return /IEMobile/i.test(navigator.userAgent); },
  any:        function() {
    return this.Android() || this.BlackBerry() ||
           this.iOS()     || this.Opera()      ||
           this.Safari()  || this.Windows();
  }
};

// ─────────────────────────────────────────────────────────────
// BLOCKCHAIN INTEGRATION
window.submitScoreToChain = sendScore;
