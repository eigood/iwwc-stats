#!/usr/bin/make -f

DIST := $(CURDIR)/dist
SILENT := $(findstring s,$(word 1, $(MAKEFLAGS)))

# ---
builder := builder1-300x300.png builder2-300x300.png builder3-300x300.png builder4-1-300x300.png builder5-1-300x300.png
connector := connector1-300x300.png connector2-300x300.png connector3-300x300.png connector4-1-300x300.png connector5-1-300x300.png
engineer := engineer1-300x300.png engineer2-300x300.png engineer3-300x300.png engineer4-1-300x300.png engineer5-1-300x300.png
explorer := explorer1-300x300.png explorer2-300x300.png explorer3-300x300.png explorer4-1-300x300.png explorer5-1-300x300.png
hacker := hacker1-300x300.png hacker2-300x300.png hacker3-300x300.png hacker4-1-300x300.png hacker5-1-300x300.png
illuminator := i_bronze-300x300.png i_silver-300x300.png i_gold-300x300.png illuminator4-300x300.png illuminator5-300x300.png
liberator := liberator1-300x300.png liberator2-300x300.png liberator3-300x300.png liberator4-1-300x300.png liberator5-1-300x300.png
maverick := maverick-silver.webp maverick-bronze.webp maverick-gold.webp maverick-platinum.webp maverick-black.webp
mind_controller := mind_controller1-300x300.png mind_controller2-300x300.png mind_controller3-300x300.png mind-controller4-300x300.png mind-controller5-1-300x300.png
pioneer := pioneer1-300x300.png pioneer2-300x300.png pioneer3-300x300.png pioneer4-1-300x300.png pioneer5-1-300x300.png
purifier := purifier1-300x300.png purifier2-300x300.png purifier3-300x300.png purifier4-1-300x300.png purifier5-1-300x300.png
recharger := recharger1-300x300.png recharger2-300x300.png recharger3-300x300.png recharger4-1-300x300.png recharger5-1-300x300.png
recon := bronze_recon-300x300.png silver_recon-300x300.png gold_recon-300x300.png plat_recon-300x300.png black_recon-300x300.png
scout_controller := scout-controller-bronze.png scout-controller-gold.png scout-controller-onyx.png scout-controller-platinum.png scout-controller-silver.png
scout_controller_size := 44x44
scout_controller_geometry := +3+3
specops := specops1-300x300.png specops2-300x300.png specops3-300x300.png specops4-1-300x300.png specops5-1-300x300.png
scout := scout-bronze.png scout-gold.png scout-onyx.png scout-platinum.png scout-silver.png
scout_size := 44x44
scout_geometry := +3+3
translator := trans_bronze-300x300.png trans_silver-300x300.png trans_gold-300x300.png translator4-300x300.png translator5-300x300.png
trekker := trekker11-300x300.png trekker2-300x300.png trekker3-300x300.png trekker4-1-300x300.png trekker5-1-300x300.png

badges := builder connector engineer explorer hacker illuminator liberator maverick mind_controller pioneer purifier recharger recon scout_controller specops scout translator trekker
#all: $(patsubst %,%.png,$(all))

sprite_size := 50x50
png_compression := #-depth 24 -define png:compression-filter=0 -define png:compression-level=9 -define png:compression-strategy=1
define make_badge_sprite
all: badge_$(1)
badge_$(1): $(DIST)/images/badge_$(1).png
$$(DIST)/images/badge_$(1).png: sprite_geometry := $$(if $$($(1)_geometry),$$($(1)_geometry),+0)
$$(DIST)/images/badge_$(1).png: sprite_size := $$(if $$($(1)_size),$$($(1)_size),$$(sprite_size))
$$(DIST)/images/badge_$(1).png: $$(patsubst %,$$(CURDIR)/src/images/badges/%,$$($(1)))
	@echo "Creating badge sprite: $(1)"
	@mkdir -p "$$(@D)"
	montage $$^ -background none $$(png_compression) -geometry '$$(sprite_size)!$$(sprite_geometry)' -tile 5x1 png32:$$(@D)/.tmp.$$(@F)
	@mv $$(@D)/.tmp.$$(@F) $$@

endef

$(foreach badge,$(badges),$(eval $(call make_badge_sprite,$(badge))))

# ---
logos := enl res

define make_logo
all: logo_$(1)
logo_$(1): $(DIST)/images/logo_$(1).png
$(DIST)/images/logo_$(1).png: $(CURDIR)/src/images/logos/$(1).png
	@echo "Creating logo: $(1)" 
	@convert $$^ -resize 128x png32:$$(@D)/.tmp.$$(@F)
	@mv $$(@D)/.tmp.$$(@F) $$@
endef

$(foreach logo,$(logos),$(eval $(call make_logo,$(logo))))

# ---

#.SILENT:
