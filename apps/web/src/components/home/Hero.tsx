// Hero component - trigger deployment
export function Hero() {
  return (
    <div className="relative h-[500px] bg-gradient-to-r from-primary-600 to-primary-800">
      <div className="absolute inset-0 bg-black/20"></div>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            'url(https://source.unsplash.com/1600x900/?wellness,nature,retreat)',
          opacity: 0.3,
        }}
      ></div>

      <div className="relative container mx-auto px-4 h-full flex flex-col justify-center items-center text-center text-white">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Find Your Perfect Wellness Retreat
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl">
          Discover cannabis-friendly, yoga-inspired, and mindful travel
          experiences around the world
        </p>
      </div>
    </div>
  );
}


