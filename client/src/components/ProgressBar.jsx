import React from 'react'

const ProgressBar = ({ value }) => {
    return (
        <div className='w-full bg-gray-200 h-3 rounded overflow-hidden'>
            <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${value}%` }}
            />

        </div>
    )
}

export default ProgressBar

