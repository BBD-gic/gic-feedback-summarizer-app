const Header = () => {
  return (
    <header
      style={{
        height: "8vh",
        width: "70%",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2vw",
        color: "white",
        boxShadow: "0 2px 7px rgba(0,0,0,0.2)",
        background: "rgba(0, 0, 0, 0.8)",
        borderRadius: "0 0 30px 30px"
      }}
    >
      {/* Logo on the left */}
      <img
        src={require("../assets/images/bbd-logo-white.png")}
        alt="BBD"
        style={{
          width: "3rem",
          height: "3rem"
        }}
      />

      {/* Text on the right */}
      <h1
        style={{
          fontSize: "1.5rem",
          fontFamily: "Bungee Shade, cursive",
          margin: 0,
          whiteSpace: "nowrap",
          letterSpacing: "2px",
          wordSpacing: "5px"
        }}
      >
        Better By Design
      </h1>
    </header>
  );
};

export default Header;
