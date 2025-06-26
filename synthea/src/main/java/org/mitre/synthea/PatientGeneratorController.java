package org.mitre.synthea;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.ResponseBody;
import org.mitre.synthea.engine.Generator;
import org.mitre.synthea.world.agents.Person;
import org.mitre.synthea.export.FhirR4;

@RestController
public class PatientGeneratorController {
    @GetMapping(value = "/generate-patient", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public String generatePatient(@RequestParam(value = "state", defaultValue = "Massachusetts") String state) {
        Generator.GeneratorOptions options = new Generator.GeneratorOptions();
        options.state = state;
        Generator generator = new Generator(options);
        long seed = System.currentTimeMillis();
        Person person = generator.generatePerson(0, seed);
        return FhirR4.convertToFHIRJson(person, 0L);
    }
} 