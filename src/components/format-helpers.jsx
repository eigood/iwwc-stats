import React from 'react'

export const useFormattedDate = (date, options = {}) => {
  const [ formatted, setFormatted ] = React.useState(typeof date === 'string' ? null : typeof date === 'object' ? {} : null)
  React.useEffect(() => {
    if (typeof date === 'string') {
      setFormatted(new Date(date).toLocaleString(navigator.language, options))
    } else if (typeof date === 'object') {
      setFormatted(Object.entries(date).reduce((formatted, [ key, value ]) => {
        formatted[ key ] = new Date(value).toLocaleString(navigator.language, options[ key ] || {})
        return formatted
      }, {}))
    } else {
      setFormatted(date.toString())
    }
  })
  return formatted
}

export const useFormattedNumber = (number, options = { useGrouping: true }) => {
  //console.log('useFormattedNumber', {number})
  const [ formatted, setFormatted ] = React.useState(null)
  React.useEffect(() => {
    if (typeof number === 'number') {
      setFormatted(Number(number || 0).toLocaleString(navigator.language, options))
    } else if (typeof number === 'object') {
      setFormatted(Object.entries(number).reduce((formatted, [ key, value ]) => {
        formatted[ key ] = Number(value || 0).toLocaleString(navigator.language, options[ key ] || {})
        return formatted
      }, {}))
    } else {
      setFormatted(number.toString())
    }
  })
  return formatted
}


