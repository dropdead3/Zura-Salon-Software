import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Star, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TogglePill } from "@/components/ui/toggle-pill";
import { stylists, locations, type Location, type Stylist, stylistWorksAtLocation } from "@/data/stylists";

const StylistCard = ({ stylist }: { stylist: Stylist }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -8 }}
      className="group relative aspect-[3/4] bg-muted overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-500"
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url(${stylist.imageUrl})` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
      
      {/* Specialty Tags */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
        {[...stylist.specialties].sort((a, b) => {
          if (a === "EXTENSIONS") return -1;
          if (b === "EXTENSIONS") return 1;
          return 0;
        }).map((specialty, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-sm text-xs font-medium tracking-wide ${
              specialty === "EXTENSIONS"
                ? "bg-oat/85 text-oat-foreground"
                : "bg-background/70 text-foreground"
            }`}
          >
            {specialty === "EXTENSIONS" && <Star className="w-3 h-3 fill-current" />}
            {specialty}
          </motion.span>
        ))}
      </div>
      
      {/* Stylist Info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 text-white transform transition-transform duration-500 group-hover:translate-y-[-4px]">
        <p className="text-xs tracking-[0.2em] text-white/70 mb-1">{stylist.level}</p>
        <h3 className="text-xl font-serif mb-1">{stylist.name}</h3>
        <a 
          href={`https://instagram.com/${stylist.instagram.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-white/70 hover:text-white transition-colors duration-200 mb-4 inline-block"
        >
          {stylist.instagram}
        </a>
        
        <Link
          to="/booking"
          className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 text-sm font-sans font-medium rounded-full hover:bg-white/90 hover:shadow-lg transition-all duration-300 group/btn active:scale-[0.98]"
        >
          <span>Book consult</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
        </Link>
      </div>
    </motion.div>
  );
};

const Stylists = () => {
  const [selectedLocation, setSelectedLocation] = useState<Location>("north-mesa");

  const filteredStylists = stylists.filter(
    (s) => stylistWorksAtLocation(s, selectedLocation)
  );

  const stylistCount = filteredStylists.length;

  return (
    <Layout>
      <SEO
        title="Our Stylists"
        description="Meet our talented team of hair stylists. From color specialists to extension experts, find the perfect stylist for your hair goals."
      />

      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="container mx-auto px-6">
          {/* Location Toggle */}
          <div className="text-center mb-12">
            <Eyebrow className="text-muted-foreground mb-6">
              VIEW STYLISTS BY LOCATION
            </Eyebrow>
            
            <TogglePill
              options={locations.map(loc => ({
                value: loc.id,
                label: loc.name,
                icon: <Info className="w-3.5 h-3.5" />,
              }))}
              value={selectedLocation}
              onChange={(val) => setSelectedLocation(val as Location)}
              size="lg"
              variant="solid"
            />
          </div>

          {/* Title with count */}
          <div className="mb-10 border-b border-border">
            <h1 className="pb-4 text-2xl md:text-3xl font-serif">
              Our Stylists
              <span className="ml-3 text-lg text-muted-foreground font-sans">({stylistCount})</span>
            </h1>
          </div>

          {/* Stylist Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedLocation}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredStylists.length > 0 ? (
                filteredStylists.map((stylist) => (
                  <StylistCard key={stylist.id} stylist={stylist} />
                ))
              ) : (
                <div className="col-span-full text-center py-20">
                  <p className="text-muted-foreground text-lg">
                    No stylists found for this location.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </Layout>
  );
};

export default Stylists;
