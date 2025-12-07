{/* Title */ }
<h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight truncate">
    {event.title}
</h2>

{/* Meta Info */ }
<div className="flex flex-wrap items-center gap-6 text-zinc-200 font-medium text-lg pt-2">
    ```
    {/* Title */}
    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight truncate">
        {event.title}
    </h2>

    {/* Meta Info */}
    <div className="flex flex-wrap items-center gap-6 text-zinc-200 font-medium text-lg pt-2">
        <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {format(startDate, 'EEEE, MMMM d, yyyy • h:mm a')}
        </div>
        {event.venue_remark && (
            <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate max-w-[250px]">{event.venue_remark}</span>
            </div>
        )}
    </div>
</div >
                </div >
            </div >

    <ImagePreviewModal
        isOpen={!!previewImage}
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
    />
        </>
    )
}
```
