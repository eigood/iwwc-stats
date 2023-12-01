export const shuffle = (array) => {
  let currentIndex = array.length

  // While there remain elements to shuffle.
  while (currentIndex > 0) {

    // Pick a remaining element.
    const randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    [ array[ currentIndex ], array[ randomIndex ] ] = [ array[ randomIndex ], array[ currentIndex ] ]
  }

  return array
}

export const rot13 = (str) => str ? str.split('')
  .map(char => char.match(/[a-z]/i) ? String.fromCharCode(char.charCodeAt(0) + (char.toLowerCase() < 'n' ? 13 : -13)) : char)
  .join('') : ''

