import Snowfall from './Snowfall';

const WinterBackground = () => {
  return (
    <>
      {/* Winter Gradient Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-indigo-900/20 to-purple-950/30"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-transparent to-purple-900/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,160,255,0.05),transparent_50%)]"></div>
      </div>

      {/* Snowfall Animation */}
      <div className="fixed inset-0 pointer-events-none -z-5">
        <Snowfall />
      </div>
    </>
  );
};

export default WinterBackground;
