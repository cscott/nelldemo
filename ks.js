function KS(sampleRate, freq) {
  this.reset(sampleRate, freq);
}
KS.prototype = {
  sampleRate: 1,
  bufferPos: 0,
  bufferLen: 0,
  buffer: null,
  sample: 0,
  plucked: false,

  generate: function() {
    var next = this.buffer[this.bufferPos];
    this.buffer[this.bufferPos++] = (next + this.sample) / 2.01;
    this.sample = next;
    if (this.bufferPos >= this.bufferLen) {
      this.bufferPos = 0;
    }
  },
  getMix: function() {
    return this.sample;
  },
  reset: function(sampleRate, freq) {
    this.sampleRate = sampleRate || this.sampleRate;
    this.bufferLen = freq ? Math.round((this.sampleRate/freq)-.5) : 100;
    this.buffer = new Float32Array(this.bufferLen);
    for (var i=0; i<this.bufferLen; i++) {
      this.buffer[i] = freq ? 2*(Math.random()-0.5) : 0;
    }
    this.bufferPos = 0;
    this.plucked = false;
    this.sample = this.buffer[this.bufferLen-1];
  }
}
