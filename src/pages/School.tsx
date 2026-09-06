import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Bus, Accessibility, Info, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const School = () => {
  const schoolName = "Elstar Mixed Education Centre";
  const schoolAddress = "P.O. Box 54145-0100, Nairobi, Kenya";
  const schoolLat = -1.2864;
  const schoolLng = 36.8172;

  const mapEmbedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8175885098765!2d${schoolLng}!3d${schoolLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMTcnMTEuMCJTIDM2wrA0OScwMS45IkU!5e0!3m2!1sen!2ske!4v1699999999999!5m2!1sen!2ske`;
  const getDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${schoolLat},${schoolLng}&destination_place_id=&travelmode=driving`;

  const officeHours = [
    { day: "Monday - Friday", hours: "8:00 AM - 4:00 PM" },
    { day: "Saturday", hours: "9:00 AM - 12:00 PM" },
    { day: "Sunday & Public Holidays", hours: "Closed" },
  ];

  const visitingGuidelines = [
    {
      icon: Info,
      title: "Office Visitors",
      description: "Please report to the front office upon arrival and sign the visitor's book before proceeding to any other area of the school.",
    },
    {
      icon: Clock,
      title: "Appointment Recommended",
      description: "For meetings with teachers or administration, we recommend booking an appointment to ensure the staff member is available.",
    },
    {
      icon: Bus,
      title: "Parking & Access",
      description: "Visitor parking is available near the main gate. Public transport and school shuttles serve the surrounding neighbourhood.",
    },
    {
      icon: Accessibility,
      title: "Accessibility",
      description: "Our main reception and key buildings are wheelchair accessible. Please call ahead if you require special assistance.",
    },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-foreground">Visit Our School</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Planning a visit? Find our location, office hours, and everything you need to make your trip to {schoolName} easy and welcoming.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Address Card */}
          <Card className="border-none shadow-lg h-full">
            <CardHeader>
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2 w-fit">
                <MapPin className="h-6 w-6" />
              </div>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {schoolName}<br />
                {schoolAddress}
              </p>
              <Button asChild className="w-full" variant="outline">
                <a
                  href={getDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Directions
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Office Hours Card */}
          <Card className="border-none shadow-lg h-full">
            <CardHeader>
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2 w-fit">
                <Clock className="h-6 w-6" />
              </div>
              <CardTitle>Office Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground">
                {officeHours.map((item) => (
                  <li key={item.day} className="flex justify-between">
                    <span>{item.day}</span>
                    <span className="font-medium text-foreground">{item.hours}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card className="border-none shadow-lg h-full">
            <CardHeader>
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2 w-fit">
                <Phone className="h-6 w-6" />
              </div>
              <CardTitle>Before Your Visit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Have questions before coming in? Reach out by phone or email and we'll be happy to help.
              </p>
              <ul className="space-y-2 text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  +254 700901266
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Elstarmixed@gmail.com
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <Card className="border-none shadow-lg overflow-hidden mb-16">
          <div className="aspect-[16/9] lg:aspect-[21/9] w-full relative">
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`${schoolName} Location Map`}
            />
          </div>
        </Card>

        {/* Visiting Guidelines */}
        <div>
          <h2 className="text-3xl font-bold mb-8 text-foreground text-center">Plan Your Visit</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {visitingGuidelines.map((guideline) => (
              <Card key={guideline.title} className="border-none shadow-lg">
                <CardHeader>
                  <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2 w-fit">
                    <guideline.icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{guideline.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{guideline.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default School;
