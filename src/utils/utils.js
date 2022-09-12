function hex2Bytes(str) {
    let pos = 0;
    let len = str.length;
    let hexA = new Uint8Array();
  
    if (str[0] === '0' && (str[1] === 'x' || str[1] === 'X')) {
      pos = 2;
      len -= 2;
    }
    if (len === 0) {
      return hexA;
    }
    if (len % 2 !== 0) {
      if (pos === 0) {
        str = '0' + str;
      } else {
        str = str.substr(0, pos) + '0' + str.substr(pos);
        len += 1;
      }
    }
  
    len /= 2;
    hexA = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      const s = str.substr(pos, 2);
      const v = parseInt(s, 16);
      hexA[i] = v;
      pos += 2;
    }
    return hexA;
  }
  
  function isEmptyObj(obj) {
    return obj == null || obj == '';
  }
  
  export { hex2Bytes, isEmptyObj }