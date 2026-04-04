import type { Stylist } from "./stylists";

// Import AI-generated headshots
import oliviaMartinez from "@/assets/sample-stylists/olivia-martinez.jpg";
import emmaJohnson from "@/assets/sample-stylists/emma-johnson.jpg";
import sophiaWilliams from "@/assets/sample-stylists/sophia-williams.jpg";
import isabellaBrown from "@/assets/sample-stylists/isabella-brown.jpg";
import miaGarcia from "@/assets/sample-stylists/mia-garcia.jpg";
import charlotteDavis from "@/assets/sample-stylists/charlotte-davis.jpg";
import ameliaWilson from "@/assets/sample-stylists/amelia-wilson.jpg";
import harperAnderson from "@/assets/sample-stylists/harper-anderson.jpg";
import evelynThomas from "@/assets/sample-stylists/evelyn-thomas.jpg";
import abigailJackson from "@/assets/sample-stylists/abigail-jackson.jpg";
import emilyWhite from "@/assets/sample-stylists/emily-white.jpg";
import elizabethHarris from "@/assets/sample-stylists/elizabeth-harris.jpg";
import sofiaMartin from "@/assets/sample-stylists/sofia-martin.jpg";
import averyThompson from "@/assets/sample-stylists/avery-thompson.jpg";
import ellaGarcia from "@/assets/sample-stylists/ella-garcia.jpg";
import scarlettLee from "@/assets/sample-stylists/scarlett-lee.jpg";

// Sample stylists for preview purposes when no real stylists are visible
// 7 for Location 1, 9 for Location 2
// Note: highlighted_services should match specialty filter names (uppercase)
export const sampleStylists: Stylist[] = [
  // North Mesa (7)
  {
    id: "sample-nm-1",
    name: "Olivia Martinez",
    instagram: "@olivia.styles",
    level: "LEVEL 4 STYLIST",
    specialties: ["EXTENSIONS", "BLONDING", "BALAYAGE"],
    highlighted_services: ["EXTENSIONS", "BLONDING", "BALAYAGE"],
    imageUrl: oliviaMartinez,
    locations: ["north-mesa"],
    isBooking: true,
    bio: "Specializing in seamless extensions and sun-kissed blondes.",
  },
  {
    id: "sample-nm-2",
    name: "Emma Johnson",
    instagram: "@emma.hair",
    level: "LEVEL 3 STYLIST",
    specialties: ["BALAYAGE", "CREATIVE COLOR", "LIVED-IN COLOR"],
    highlighted_services: ["BALAYAGE", "CREATIVE COLOR"],
    imageUrl: emmaJohnson,
    locations: ["north-mesa"],
    isBooking: true,
    bio: "Creating dimensional color that grows out beautifully.",
  },
  {
    id: "sample-nm-3",
    name: "Sophia Williams",
    instagram: "@sophiawilliams",
    level: "LEVEL 3 STYLIST",
    specialties: ["EXTENSIONS", "PRECISION CUTS", "STYLING"],
    highlighted_services: ["EXTENSIONS", "PRECISION CUTS", "STYLING"],
    imageUrl: sophiaWilliams,
    locations: ["north-mesa"],
    isBooking: true,
    bio: "Expert in natural-looking extensions and modern cuts.",
  },
  {
    id: "sample-nm-4",
    name: "Isabella Brown",
    instagram: "@isabella.b",
    level: "LEVEL 2 STYLIST",
    specialties: ["BLONDING", "COLOR CORRECTION", "BALAYAGE"],
    highlighted_services: ["BLONDING", "COLOR CORRECTION"],
    imageUrl: isabellaBrown,
    locations: ["north-mesa"],
    isBooking: true,
    bio: "Blonde specialist with a passion for transformations.",
  },
  {
    id: "sample-nm-5",
    name: "Mia Garcia",
    instagram: "@mia.does.hair",
    level: "LEVEL 2 STYLIST",
    specialties: ["BALAYAGE", "LIVED-IN COLOR", "BLONDING"],
    highlighted_services: ["BALAYAGE", "LIVED-IN COLOR", "BLONDING"],
    imageUrl: miaGarcia,
    locations: ["north-mesa"],
    isBooking: true,
    bio: "Low-maintenance color that fits your lifestyle.",
  },
  {
    id: "sample-nm-6",
    name: "Charlotte Davis",
    instagram: "@char.styles",
    level: "LEVEL 1 STYLIST",
    specialties: ["PRECISION CUTS", "STYLING", "BLOWOUTS"],
    highlighted_services: ["PRECISION CUTS", "STYLING"],
    imageUrl: charlotteDavis,
    locations: ["north-mesa"],
    isBooking: true,
    bio: "Creating confidence through precision haircuts.",
  },
  {
    id: "sample-nm-7",
    name: "Amelia Wilson",
    instagram: "@amelia.cuts",
    level: "LEVEL 1 STYLIST",
    specialties: ["STYLING", "BLOWOUTS", "PRECISION CUTS"],
    highlighted_services: ["STYLING", "BLOWOUTS"],
    imageUrl: ameliaWilson,
    locations: ["north-mesa"],
    isBooking: true,
    bio: "Making every day a good hair day.",
  },

  // Val Vista Lakes (9)
  {
    id: "sample-vv-1",
    name: "Harper Anderson",
    instagram: "@harper.hair",
    level: "LEVEL 4 STYLIST",
    specialties: ["EXTENSIONS", "BLONDING", "BALAYAGE"],
    highlighted_services: ["EXTENSIONS", "BLONDING", "BALAYAGE"],
    imageUrl: harperAnderson,
    locations: ["val-vista-lakes"],
    isBooking: true,
    bio: "Master extension artist creating your dream hair.",
  },
  {
    id: "sample-vv-2",
    name: "Evelyn Thomas",
    instagram: "@evelyn.t",
    level: "LEVEL 4 STYLIST",
    specialties: ["BLONDING", "COLOR CORRECTION", "CREATIVE COLOR"],
    highlighted_services: ["BLONDING", "COLOR CORRECTION", "CREATIVE COLOR"],
    imageUrl: evelynThomas,
    locations: ["val-vista-lakes"],
    isBooking: true,
    bio: "Color specialist turning hair goals into reality.",
  },
  {
    id: "sample-vv-3",
    name: "Abigail Jackson",
    instagram: "@abigail.styles",
    level: "LEVEL 3 STYLIST",
    specialties: ["EXTENSIONS", "PRECISION CUTS", "BLONDING"],
    highlighted_services: ["EXTENSIONS", "PRECISION CUTS"],
    imageUrl: abigailJackson,
    locations: ["val-vista-lakes"],
    isBooking: true,
    bio: "Extensions that look and feel like your own hair.",
  },
  {
    id: "sample-vv-4",
    name: "Emily White",
    instagram: "@emily.w",
    level: "LEVEL 3 STYLIST",
    specialties: ["BALAYAGE", "LIVED-IN COLOR", "BLONDING"],
    highlighted_services: ["BALAYAGE", "LIVED-IN COLOR", "BLONDING"],
    imageUrl: emilyWhite,
    locations: ["val-vista-lakes"],
    isBooking: true,
    bio: "Effortless, sun-kissed color is my specialty.",
  },
  {
    id: "sample-vv-5",
    name: "Elizabeth Harris",
    instagram: "@liz.hair",
    level: "LEVEL 2 STYLIST",
    specialties: ["BLONDING", "BALAYAGE", "COLOR CORRECTION"],
    highlighted_services: ["BLONDING", "BALAYAGE"],
    imageUrl: elizabethHarris,
    locations: ["val-vista-lakes"],
    isBooking: true,
    bio: "Bright blondes and seamless balayage.",
  },
  {
    id: "sample-vv-6",
    name: "Sofia Martin",
    instagram: "@sofia.m",
    level: "LEVEL 2 STYLIST",
    specialties: ["CREATIVE COLOR", "VIVIDS"],
    highlighted_services: ["CREATIVE COLOR", "VIVIDS"],
    imageUrl: sofiaMartin,
    locations: ["val-vista-lakes"],
    isBooking: true,
    bio: "Bold, vibrant color for those who dare to stand out.",
  },
  {
    id: "sample-vv-7",
    name: "Avery Thompson",
    instagram: "@avery.t",
    level: "LEVEL 2 STYLIST",
    specialties: ["PRECISION CUTS", "STYLING", "BLOWOUTS"],
    highlighted_services: ["PRECISION CUTS", "STYLING", "BLOWOUTS"],
    imageUrl: averyThompson,
    locations: ["val-vista-lakes"],
    isBooking: true,
    bio: "Modern cuts with timeless style.",
  },
  {
    id: "sample-vv-8",
    name: "Ella Garcia",
    instagram: "@ella.g",
    level: "LEVEL 1 STYLIST",
    specialties: ["STYLING", "BLOWOUTS", "PRECISION CUTS"],
    highlighted_services: ["STYLING", "BLOWOUTS"],
    imageUrl: ellaGarcia,
    locations: ["val-vista-lakes"],
    isBooking: true,
    bio: "Gorgeous blowouts for any occasion.",
  },
  {
    id: "sample-vv-9",
    name: "Scarlett Lee",
    instagram: "@scarlett.styles",
    level: "LEVEL 1 STYLIST",
    specialties: ["PRECISION CUTS", "CREATIVE COLOR", "STYLING"],
    highlighted_services: ["PRECISION CUTS", "CREATIVE COLOR"],
    imageUrl: scarlettLee,
    locations: ["val-vista-lakes"],
    isBooking: true,
    bio: "Fresh cuts and glossy finishes.",
  },
];

// Helper to get sample stylists by location
export const getSampleStylistsByLocation = (location: string): typeof sampleStylists => {
  if (location === "all") return sampleStylists;
  return sampleStylists.filter(s => s.locations.includes(location as any));
};
