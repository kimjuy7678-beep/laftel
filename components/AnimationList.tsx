'use client'

import { useEffect, useState } from 'react'
import { useAniStore } from '../store/useAniStore'


const AniList = () => {
    const { aniList, aniVideos, onFetchAni, onFetchVideo } = useAniStore();
    const [hover, setHover] = useState<number | null>(null);

    useEffect(() => {
        onFetchAni();
    }, []);

    const handleMouseEnter = async (id: number, name: string) => {
        setHover(id);
        await onFetchVideo(id, name);
    }

    const handleMouseLeave = () => {
        setHover(null);
    }

    return (
        <ul className="list grid grid-cols-4 gap-8">
            {aniList.map((ani: any) => {
                const video = aniVideos[ani.id];
                const trailerKey = video?.key || null;

                return (
                    <li key={ani.id}
                        onMouseEnter={() => handleMouseEnter(ani.id, ani.name)}
                        onMouseLeave={handleMouseLeave}>
                        <div className="img-box relative">
                            <img src={`https://image.tmdb.org/t/p/original${ani.backdrop_path}`} alt={ani.name} />
                            {hover === ani.id && trailerKey && (
                                <div className='absolute left-0 top-0 w-full h-full z-1000'>
                                    <iframe
                                        className='w-full h-60'
                                        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1`}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="text-box">
                            <h3 className='text-2xl font-bold'>{ani.name}</h3>
                            <p>{ani.vote_average}</p>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}

export default AniList